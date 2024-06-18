import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDto } from './dto/user.dto';
import { User } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as Filter from 'bad-words';

type Tokens = {
  access_token: string,
  refresh_token: string
};

@Injectable()
export class UsersService {
  private filter: Filter;

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtSvc: JwtService
  ) {
    this.filter = new Filter();
  }

  async register(createUserDto: UserDto, email: string): Promise<User> {
    const isEmailExist = await this.userRepository.findOne({ where: { email } });

    if (isEmailExist) {
      throw new BadRequestException('User already exist with this email!');
    }

    if (this.filter.isProfane(createUserDto.name)) {
      throw new BadRequestException('No puedes registrarte por lenguaje inapropiado');
    }

    try {
      const newUser = this.userRepository.create(createUserDto);
      return await this.userRepository.save(newUser);
    } catch (error) {
      throw new HttpException('Please check your credentials', HttpStatus.UNAUTHORIZED);
    }
  }

  async loginUser(email: string) {
    try {
      const user = await this.userRepository.findOne({ where: { email } });

      if (user) {
        const payload = { sub: user.id, email: user.email }

        return {
          access_token: await this.jwtSvc.signAsync(payload, {
            secret: 'jwt_secret',
            expiresIn: '30m'
          }),
          refresh_token: await this.jwtSvc.signAsync(payload, {
            secret: 'jwt_secret_refresh',
            expiresIn: '1h'
          }),
          message: 'Login Successful/Completa tu registro'
        };
      }
    } catch (error) {
      throw new HttpException('Please check your credentials', HttpStatus.UNAUTHORIZED);
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const user = this.jwtSvc.verify(refreshToken, { secret: 'jwt_secret_refresh' });
      const payload = { sub: user.id, email: user.email, name: user.name };
      const { access_token, refresh_token } = await this.generateTokens(payload);
      return {
        access_token, refresh_token,
        status: 200,
        message: 'Refresh token successfully'
      };
    } catch (error) {
      throw new HttpException('Refresh token failed', HttpStatus.UNAUTHORIZED)
    }
  }

  private async generateTokens(user): Promise<Tokens> {
    const jwtPayload = { sub: user.id, email: user.email, name: user.name }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtSvc.signAsync(jwtPayload, {
        secret: 'jwt_secret',
        expiresIn: '30m',
      }),
      this.jwtSvc.signAsync(jwtPayload, {
        secret: 'jwt_secret_refresh',
        expiresIn: '12h',
      }),
    ])
    return {
      access_token: accessToken,
      refresh_token: refreshToken
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async getAllScores(): Promise<{ name: string; puntuacion: number }[]> {
    try {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.name', 'user.puntuacion'])
        .orderBy('user.puntuacion', 'DESC')
        .limit(10)
        .getMany();

      return users.map(user => ({
        name: user.name,
        puntuacion: user.puntuacion,
      }));
    } catch (error) {
      console.error('Error retrieving scores:', error.message);
      throw new HttpException('Could not retrieve scores', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: Number(userId) });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    await this.userRepository.remove(user);
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }
}
