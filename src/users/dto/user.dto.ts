import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UserDto {
  @ApiProperty({ description: 'El nombre del usuario' })
  @IsString()
  readonly name: string;

  @ApiProperty({ description: 'El correo electrónico del usuario', uniqueItems: true })
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @ApiProperty({ description: 'La puntuación del usuario' })
  @IsNumber()
  readonly puntuacion: number;

  @ApiProperty({ description: 'El rol del usuario' })
  @IsString()
  readonly rol: string;
}
